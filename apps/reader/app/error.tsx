'use client';

import { messages } from '@/shared/config/messages';
import { logger } from '@/shared/lib/logger';
import { Button } from '@/shared/ui';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  logger.error('route error', { message: error.message, digest: error.digest });
  return (
    <div role="alert" className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{messages.error.title}</h1>
      <Button className="mt-6" onClick={reset}>
        {messages.error.retry}
      </Button>
    </div>
  );
}
