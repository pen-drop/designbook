import { join } from 'node:path' // 1. Add dependencies.
import { cwd } from 'node:process'
export const baseTheme = join(cwd(), '../../contrib/ui_suite_daisyui/');
