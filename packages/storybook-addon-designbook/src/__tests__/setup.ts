/**
 * Global test setup.
 *
 * A built package has `dist/skills/`; fixture-based tests must not pick those
 * up as bundled skills. Tests of the resolver inject `bundledRoot` explicitly.
 */
import { vi } from 'vitest';

vi.mock('../workflow/bundled-skills.js', () => ({ bundledSkillsRoot: () => null }));
