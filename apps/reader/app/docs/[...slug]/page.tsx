import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDocument } from '@/entities/document/server';
import { DocumentView } from '@/views/document';

type Props = { params: Promise<{ slug: string[] }> };

// Resolving metadata before streaming starts lets an unknown document return a real 404.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const document = await getDocument((await params).slug);
  if (!document) notFound();
  return { title: document.title };
}

export default async function DocumentPage({ params }: Props) {
  return <DocumentView slug={(await params).slug} />;
}
