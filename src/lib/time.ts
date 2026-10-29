export function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

interface Parts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function partsIn(date: Date, timeZone: string): Parts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const get = (type: string) => Number(fmt.formatToParts(date).find((p) => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/** Offset of `timeZone` from UTC at `date`, in minutes (Asia/Baku → 240). */
export function offsetMinutes(date: Date, timeZone: string): number {
  const p = partsIn(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60_000);
}

const pad = (n: number, w = 2) => String(Math.abs(n)).padStart(w, '0');

/** ISO 8601 with the zone's offset, e.g. 2026-10-29T08:00:00+04:00 */
export function toIsoInZone(date: Date, timeZone: string): string {
  const p = partsIn(date, timeZone);
  const off = offsetMinutes(date, timeZone);
  const sign = off < 0 ? '-' : '+';
  return (
    `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}` +
    `${sign}${pad(Math.trunc(off / 60))}:${pad(off % 60)}`
  );
}

/** Calendar date (YYYY-MM-DD) of `date` in `timeZone`. */
export function localDate(date: Date | string, timeZone: string): string {
  const p = partsIn(typeof date === 'string' ? new Date(date) : date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Shift a YYYY-MM-DD date by whole days. */
export function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Parses feed dates (RFC 822, ISO 8601, epoch seconds). Unknown → null, never "now". */
export function parseLooseDate(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  let ms: number;
  if (typeof value === 'number') {
    ms = value < 1e12 ? value * 1000 : value;
  } else {
    ms = Date.parse(String(value).trim());
  }
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}
