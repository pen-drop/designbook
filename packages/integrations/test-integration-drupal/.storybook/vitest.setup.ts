import { beforeAll } from 'vitest';
import { setProjectAnnotations } from '@storybook/html';
import * as rendererAnnotations from '@storybook/html/entry-preview';

const project = setProjectAnnotations([rendererAnnotations]);

beforeAll(project.beforeAll);
