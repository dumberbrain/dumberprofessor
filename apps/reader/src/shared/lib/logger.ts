/* The only place allowed to write to the console (team standard: no console.log). */
export const logger = {
  warn: (message: string, details?: unknown) => console.warn(`[reader] ${message}`, details ?? ''),
  error: (message: string, details?: unknown) => console.error(`[reader] ${message}`, details ?? ''),
};
