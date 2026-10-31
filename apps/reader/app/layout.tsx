import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@/app-layer/providers';
import { messages } from '@/shared/config/messages';
import { SkipLink } from '@/shared/ui';
import { AppShell } from '@/widgets/app-shell';
import './globals.css';

export const metadata: Metadata = {
  title: { default: messages.appTitle, template: `%s · ${messages.appTitle}` },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="az" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <SkipLink />
        <ThemeProvider nonce={nonce}>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
