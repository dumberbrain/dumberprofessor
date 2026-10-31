import { z } from 'zod';
import { ProfessorConfig } from '../schemas/professor.js';

/** config/professor.schema.json content, generated from the zod schema (research.md R5). */
export function professorJsonSchema(): string {
  const schema = z.toJSONSchema(ProfessorConfig, { io: 'input', unrepresentable: 'any' });
  return `${JSON.stringify({ ...schema, title: 'Professor configuration' }, null, 2)}\n`;
}
