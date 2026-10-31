import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

/** Native <select> styled with the theme tokens: works in a plain GET form without JavaScript. */
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  );
}
