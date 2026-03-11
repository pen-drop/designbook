import { beforeAll } from 'vitest';
import { setProjectAnnotations } from '@storybook/html';
// @ts-expect-error - internal Storybook entry point, not in public types
import * as rendererAnnotations from '@storybook/html/dist/entry-preview.mjs';

const project = setProjectAnnotations([rendererAnnotations]);

beforeAll(project.beforeAll);
