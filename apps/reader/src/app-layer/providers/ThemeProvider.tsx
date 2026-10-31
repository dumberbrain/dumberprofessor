'use client';

import { ThemeProvider as NextThemes } from 'next-themes';
import type { ReactNode } from 'react';

export function ThemeProvider({ nonce, children }: { nonce?: string; children: ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange nonce={nonce}>
      {children}
    </NextThemes>
  );
}
