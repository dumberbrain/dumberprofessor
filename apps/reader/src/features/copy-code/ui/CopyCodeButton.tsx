'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { messages } from '@/shared/config/messages';
import { logger } from '@/shared/lib/logger';

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logger.warn('clipboard unavailable', error);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={messages.copy.label}
      className="absolute top-2 right-2 rounded-md border bg-background/80 p-1.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      <span aria-live="polite" className="sr-only">
        {copied ? messages.copy.done : ''}
      </span>
    </button>
  );
}
