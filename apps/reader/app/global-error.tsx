'use client';

import { messages } from '@/shared/config/messages';
import { logger } from '@/shared/lib/logger';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  logger.error('global error', { message: error.message, digest: error.digest });
  return (
    <html lang="az">
      <body>
        <main role="alert" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <h1>{messages.error.title}</h1>
          <button type="button" onClick={reset}>
            {messages.error.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
