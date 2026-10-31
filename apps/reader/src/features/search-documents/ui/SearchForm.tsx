import { Search } from 'lucide-react';
import type { DocumentType } from '@/entities/document';
import { messages } from '@/shared/config/messages';
import { cn } from '@/shared/lib/cn';
import { Button, Input, NativeSelect } from '@/shared/ui';

type Props = {
  q?: string;
  domain?: string;
  type?: string;
  /** with domain/type filters (search page) or a single box (header) */
  domains?: { id: string; name: string }[];
  className?: string;
};

const TYPES: Exclude<DocumentType, 'other'>[] = ['lesson', 'research', 'news'];

/** A plain GET form: search works without JavaScript and the URL is shareable. */
export function SearchForm({ q, domain, type, domains, className }: Props) {
  return (
    <form
      role="search"
      aria-label={domains ? messages.search.advanced : messages.search.label}
      method="get"
      action="/search"
      className={cn('flex flex-wrap items-center gap-2', className)}
    >
      <label className="relative min-w-40 flex-1">
        <span className="sr-only">{messages.search.label}</span>
        <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={messages.search.placeholder}
          className="ps-8"
          maxLength={200}
        />
      </label>
      {domains && (
        <>
          <label className="flex items-center gap-2 text-sm">
            {messages.search.domain}
            <NativeSelect name="domain" defaultValue={domain ?? ''}>
              <option value="">{messages.search.any}</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="flex items-center gap-2 text-sm">
            {messages.search.type}
            <NativeSelect name="type" defaultValue={type ?? ''}>
              <option value="">{messages.search.any}</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {messages.types[t]}
                </option>
              ))}
            </NativeSelect>
          </label>
          <Button type="submit">{messages.search.submit}</Button>
        </>
      )}
    </form>
  );
}
