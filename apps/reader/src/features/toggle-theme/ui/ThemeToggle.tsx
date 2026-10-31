'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { messages } from '@/shared/config/messages';
import { NativeSelect } from '@/shared/ui';

const subscribe = () => () => {};
/** true only after hydration — the stored theme is unknown on the server (no useEffect needed). */
const useHydrated = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

const OPTIONS = ['system', 'light', 'dark'] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{messages.theme.label}</span>
      <NativeSelect
        value={hydrated ? (theme ?? 'system') : 'system'}
        onChange={(e) => setTheme(e.target.value)}
        disabled={!hydrated}
      >
        {OPTIONS.map((o) => (
          <option key={o} value={o}>
            {messages.theme[o]}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}
