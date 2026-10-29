import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  processEntities: true,
  htmlEntities: true,
  parseTagValue: false,
  trimValues: true,
});

export function parseXml(xml: string): Record<string, unknown> {
  return parser.parse(xml) as Record<string, unknown>;
}

export function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Text of a node that may be a string or {#text, @_type}. */
export function text(node: unknown): string | undefined {
  if (node === undefined || node === null) return undefined;
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (typeof node === 'object' && '#text' in node) return String((node as Record<string, unknown>)['#text']);
  return undefined;
}
