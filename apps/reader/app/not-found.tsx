import Link from 'next/link';
import { messages } from '@/shared/config/messages';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{messages.notFound.title}</h1>
      <p className="mt-2 text-muted-foreground">{messages.notFound.body}</p>
      <Link href="/" className="mt-6 inline-block text-primary underline underline-offset-4">
        {messages.notFound.back}
      </Link>
    </div>
  );
}
