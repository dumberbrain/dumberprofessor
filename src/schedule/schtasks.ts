import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const TASK_NAME = 'Professor-DailyReport';
/** Names used before feature 002; removed so exactly one task exists (FR-036). */
export const LEGACY_TASK_NAMES = ['FrontendProfessor-DailyReport'];

export type Exec = (cmd: string, args: string[]) => Promise<string>;

const defaultExec: Exec = (cmd, args) =>
  new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true, timeout: 30_000 }, (err, stdout, stderr) =>
      err ? reject(new Error((stderr || err.message).trim())) : resolve(stdout),
    );
  });

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface TaskXmlOptions {
  time: string;
  scriptPath: string;
  workingDir: string;
  /** YYYY-MM-DD of the first trigger */
  today: string;
}

/**
 * Daily trigger, run as soon as possible after a missed start, one retry after 10 minutes,
 * only while the user is logged on, least privilege (research.md R8).
 */
export function buildTaskXml(o: TaskXmlOptions): string {
  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Professor: generate the daily news report</Description>
  </RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>${o.today}T${o.time}:00</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByDay>
        <DaysInterval>1</DaysInterval>
      </ScheduleByDay>
    </CalendarTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>true</RunOnlyIfNetworkAvailable>
    <ExecutionTimeLimit>PT1H</ExecutionTimeLimit>
    <RestartOnFailure>
      <Interval>PT10M</Interval>
      <Count>1</Count>
    </RestartOnFailure>
    <Enabled>true</Enabled>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>powershell.exe</Command>
      <Arguments>-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${xmlEscape(o.scriptPath)}"</Arguments>
      <WorkingDirectory>${xmlEscape(o.workingDir)}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
`;
}

export interface TaskStatus {
  registered: boolean;
  /** legacy task names still registered */
  legacy?: string[];
  nextRun?: string;
  state?: string;
}

function parseQuery(out: string): TaskStatus {
  const field = (name: string) => new RegExp(`^${name}:\\s*(.+)$`, 'mi').exec(out)?.[1]?.trim();
  return { registered: true, nextRun: field('Next Run Time'), state: field('Status') };
}

export function createScheduler(opts: { exec?: Exec; scriptPath: string; workingDir: string }) {
  const exec = opts.exec ?? defaultExec;

  async function query(name: string): Promise<TaskStatus> {
    try {
      return parseQuery(await exec('schtasks', ['/Query', '/TN', name, '/FO', 'LIST', '/V']));
    } catch {
      return { registered: false };
    }
  }

  async function remove(name: string): Promise<void> {
    try {
      await exec('schtasks', ['/Delete', '/TN', name, '/F']);
    } catch {
      // already absent
    }
  }

  async function status(): Promise<TaskStatus> {
    const current = await query(TASK_NAME);
    const legacy: string[] = [];
    for (const name of LEGACY_TASK_NAMES) if ((await query(name)).registered) legacy.push(name);
    return legacy.length ? { ...current, legacy } : current;
  }

  /** Registers the task, then confirms it by querying; throws if either step fails (FR-019). */
  async function enable(time: string): Promise<TaskStatus> {
    const dir = await mkdtemp(join(tmpdir(), 'fp-task-'));
    const file = join(dir, 'task.xml');
    for (const name of LEGACY_TASK_NAMES) await remove(name);
    try {
      const xml = buildTaskXml({
        time,
        scriptPath: opts.scriptPath,
        workingDir: opts.workingDir,
        today: new Date().toISOString().slice(0, 10),
      });
      // schtasks expects UTF-16 LE with BOM for XML definitions
      await writeFile(file, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(xml, 'utf16le')]));
      await exec('schtasks', ['/Create', '/TN', TASK_NAME, '/XML', file, '/F']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
    const observed = await query(TASK_NAME);
    if (!observed.registered) throw new Error(`task ${TASK_NAME} was not observed after registration`);
    return observed;
  }

  async function disable(): Promise<void> {
    for (const name of [TASK_NAME, ...LEGACY_TASK_NAMES]) await remove(name);
  }

  return { status, enable, disable };
}
