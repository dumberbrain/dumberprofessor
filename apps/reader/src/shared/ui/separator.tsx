import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

export function Separator({ className, ...props }: ComponentProps<'hr'>) {
  return <hr className={cn('my-6 border-border', className)} {...props} />;
}
