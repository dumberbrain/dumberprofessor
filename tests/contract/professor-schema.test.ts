import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { professorJsonSchema } from '../../src/config/schema.js';
import { ProfessorConfig } from '../../src/schemas/professor.js';

describe('config/professor.schema.json', () => {
  it('is the schema generated from zod (run `npm run fp -- config schema` after changing it)', () => {
    expect(readFileSync('config/professor.schema.json', 'utf8').replace(/\r\n/g, '\n')).toBe(professorJsonSchema());
  });

  it('the committed config and the default template are valid', () => {
    for (const path of ['config/professor.json', 'src/config/default-professor.json']) {
      expect(ProfessorConfig.safeParse(JSON.parse(readFileSync(path, 'utf8'))).success, path).toBe(true);
    }
  });
});
