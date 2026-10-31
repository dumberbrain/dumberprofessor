import { messages } from '@/shared/config/messages';

export default function Loading() {
  return (
    <p role="status" className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">
      {messages.loading}
    </p>
  );
}
