'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

type SheetContentProps = ComponentProps<typeof Dialog.Content> & {
  title: string;
  closeLabel: string;
  children: ReactNode;
};

/** Left-side drawer (mobile navigation). Radix handles focus trap, Escape and aria. */
export function SheetContent({ title, closeLabel, className, children, ...props }: SheetContentProps) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
      <Dialog.Content
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] overflow-y-auto bg-background p-4 shadow-lg',
          className,
        )}
        {...props}
      >
        <div className="mb-4 flex items-center justify-between">
          <Dialog.Title className="font-semibold">{title}</Dialog.Title>
          <Dialog.Close aria-label={closeLabel} className="rounded-md p-1 hover:bg-accent">
            <X className="size-4" aria-hidden />
          </Dialog.Close>
        </div>
        <Dialog.Description className="sr-only">{title}</Dialog.Description>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
