import { describe, expect, it } from 'vitest';
import { buildTaskXml, createScheduler, TASK_NAME, type Exec } from '../../src/schedule/schtasks.js';

const QUERY_OK = `Folder: \\
HostName:                             PC
TaskName:                             \\${TASK_NAME}
Next Run Time:                        10/30/2026 8:00:00 AM
Status:                               Ready
`;

function fakeExec(responses: { create?: Error; query?: string | Error; del?: Error }) {
  const calls: string[][] = [];
  const exec: Exec = async (_cmd, args) => {
    calls.push(args);
    if (args[0] === '/Create') {
      if (responses.create) throw responses.create;
      return '';
    }
    if (args[0] === '/Query') {
      if (responses.query instanceof Error) throw responses.query;
      return responses.query ?? '';
    }
    if (args[0] === '/Delete' && responses.del) throw responses.del;
    return '';
  };
  return Object.assign(exec, { calls });
}

const opts = { scriptPath: 'C:\\repo\\scripts\\schedule\\run-scheduled.ps1', workingDir: 'C:\\repo' };

describe('buildTaskXml', () => {
  it('runs daily at the time, starts when available after a missed start, retries once after 10 minutes', () => {
    const xml = buildTaskXml({ time: '08:00', ...opts, today: '2026-10-29' });
    expect(xml).toContain('<StartBoundary>2026-10-29T08:00:00</StartBoundary>');
    expect(xml).toContain('<DaysInterval>1</DaysInterval>');
    expect(xml).toContain('<StartWhenAvailable>true</StartWhenAvailable>');
    expect(xml).toMatch(/<RestartOnFailure>\s*<Interval>PT10M<\/Interval>\s*<Count>1<\/Count>/);
    expect(xml).toContain('<RunLevel>LeastPrivilege</RunLevel>');
    expect(xml).toContain('run-scheduled.ps1');
  });

  it('escapes XML special characters in paths', () => {
    const xml = buildTaskXml({ time: '08:00', scriptPath: 'C:\\a&b\\x.ps1', workingDir: 'C:\\a&b', today: '2026-10-29' });
    expect(xml).toContain('C:\\a&amp;b');
    expect(xml).not.toContain('a&b');
  });
});

describe('scheduler', () => {
  it('enable registers then confirms via query', async () => {
    const exec = fakeExec({ query: QUERY_OK });
    const s = createScheduler({ exec, ...opts });
    const status = await s.enable('08:00');
    expect(status).toEqual({ registered: true, nextRun: '10/30/2026 8:00:00 AM', state: 'Ready' });
    expect(exec.calls.map((c) => c[0])).toEqual(['/Create', '/Query']);
    expect(exec.calls[0]).toContain(TASK_NAME);
  });

  it('enable fails when registration fails', async () => {
    const s = createScheduler({ exec: fakeExec({ create: new Error('Access is denied.') }), ...opts });
    await expect(s.enable('08:00')).rejects.toThrow(/Access is denied/);
  });

  it('enable fails when the task cannot be observed after registration', async () => {
    const s = createScheduler({ exec: fakeExec({ query: new Error('ERROR: The system cannot find the file specified.') }), ...opts });
    await expect(s.enable('08:00')).rejects.toThrow(/not observed/);
  });

  it('status reports the observed state, never an assumed one', async () => {
    expect(await createScheduler({ exec: fakeExec({ query: new Error('not found') }), ...opts }).status()).toEqual({ registered: false });
    expect((await createScheduler({ exec: fakeExec({ query: QUERY_OK }), ...opts }).status()).registered).toBe(true);
  });

  it('disable deletes the task and tolerates a missing one', async () => {
    const exec = fakeExec({ del: new Error('ERROR: The system cannot find the file specified.') });
    await expect(createScheduler({ exec, ...opts }).disable()).resolves.toBeUndefined();
    expect(exec.calls[0]).toEqual(['/Delete', '/TN', TASK_NAME, '/F']);
  });
});
