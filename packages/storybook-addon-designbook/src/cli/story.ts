import type { Command } from 'commander';
import { loadConfig } from '../config.js';
import { DeboStory } from '../story-entity.js';

export function register(program: Command): void {
  program
    .command('story')
    .description('Load DeboStory entity — returns complete story data as JSON')
    .argument('[subcommand]', 'Subcommand: "checks" returns workflow-ready checks array')
    .option('--scene <ref>', 'Scene reference (e.g. design-system:shell)')
    .option('--section <name>', 'Section name — returns array of stories')
    .option('--checks-open', 'Filter checks to only open (status != done)')
    .option('--create', 'Create story dir + meta.yml if missing (triggers ensureMeta)')
    .option('--json <data>', 'JSON data (context-dependent)')
    .action(
      async (
        subcommand: string | undefined,
        opts: {
          scene?: string;
          section?: string;
          checksOpen?: boolean;
          create?: boolean;
          json?: string;
        },
      ) => {
        const config = loadConfig();
        try {
          // ── subcommand: check (update a single check result) ───────────────
          if (subcommand === 'check') {
            if (!opts.scene) {
              console.error('Error: --scene is required for check');
              process.exitCode = 1;
              return;
            }
            if (!opts.json) {
              console.error(
                'Error: --json is required for check (e.g. --json \'{"breakpoint":"sm","region":"full","status":"pass","diff":1.2}\')',
              );
              process.exitCode = 1;
              return;
            }
            const story = DeboStory.loadByScene(config, opts.scene);
            if (!story) {
              console.error(`Error: scene "${opts.scene}" not found or no story exists`);
              process.exitCode = 1;
              return;
            }
            const data = JSON.parse(opts.json) as {
              breakpoint: string;
              region: string;
              status: string;
              result?: string;
              diff?: number;
            };
            if (!data.breakpoint || !data.region || !data.status) {
              console.error('Error: --json must contain breakpoint, region, and status');
              process.exitCode = 1;
              return;
            }
            story.updateCheck({
              breakpoint: data.breakpoint,
              region: data.region,
              status: data.status as 'open' | 'done',
              result: data.result as 'pass' | 'fail' | undefined,
              diff: data.diff,
            });
            console.log(JSON.stringify({ ok: true, ...data }));
            return;
          }

          // ── subcommand: checks ────────────────────────────────────────────
          if (subcommand === 'checks') {
            if (!opts.scene) {
              console.error('Error: --scene is required for checks');
              process.exitCode = 1;
              return;
            }
            // Create story if --create is set, otherwise load
            let story: DeboStory | null = null;
            if (opts.create) {
              const metaData = opts.json ? JSON.parse(opts.json) : undefined;
              story = DeboStory.createByScene(config, opts.scene, metaData);
            } else {
              story = DeboStory.loadByScene(config, opts.scene);
            }
            if (!story) {
              console.error('Error: could not resolve scene or create story');
              process.exitCode = 1;
              return;
            }
            // Validate reference exists
            if (!story.reference?.url) {
              console.error('Error: no reference configured for this story. Provide reference via --create --json.');
              process.exitCode = 1;
              return;
            }
            // Return workflow-ready checks array
            const checksFilter: { open: boolean } | undefined = opts.checksOpen ? { open: true } : undefined;
            const checks = story.checks(checksFilter).map((c) => ({
              storyId: c.storyId,
              type: c.type,
              breakpoint: c.breakpoint,
              region: c.region,
              threshold: c.threshold,
            }));
            if (checks.length === 0) {
              console.error('Error: no checks generated. Check breakpoints and regions in meta.yml.');
              process.exitCode = 1;
              return;
            }
            console.log(JSON.stringify(checks, null, 2));
            return;
          }

          if (opts.section) {
            // Return array of DeboStory objects for all stories in section
            const stories = DeboStory.list(config, { section: opts.section });
            const json = stories.map((s) => s.toJSON({ checksOpen: opts.checksOpen }));
            console.log(JSON.stringify(json, null, 2));
          } else if (opts.scene) {
            // --create: ensure story directory and meta.yml exist
            if (opts.create) {
              const metaData = opts.json ? JSON.parse(opts.json) : undefined;
              const story = DeboStory.createByScene(config, opts.scene, metaData);
              if (!story) {
                console.error('Error: could not resolve scene or create story');
                process.exitCode = 1;
                return;
              }
              const json = story.toJSON({ checksOpen: opts.checksOpen });
              const storybookUrl = config['designbook.url'] as string | undefined;
              const output = {
                ...json,
                url: storybookUrl ? `${storybookUrl}/iframe.html?id=${story.storyId}&viewMode=story` : undefined,
                filePath: json.storyDir,
              };
              console.log(JSON.stringify(output, null, 2));
              return;
            }

            // Load DeboStory by scene reference
            const story = DeboStory.loadByScene(config, opts.scene);
            if (!story) {
              console.error(`Error: scene "${opts.scene}" not found or no story exists`);
              process.exitCode = 1;
              return;
            }
            const json = story.toJSON({ checksOpen: opts.checksOpen });
            // Include backwards-compatible fields
            const storybookUrl = config['designbook.url'] as string | undefined;
            const output = {
              ...json,
              url: storybookUrl ? `${storybookUrl}/iframe.html?id=${story.storyId}&viewMode=story` : undefined,
              filePath: json.storyDir,
            };
            console.log(JSON.stringify(output, null, 2));
          } else {
            console.error('Error: --scene or --section is required');
            process.exitCode = 1;
          }
        } catch (err) {
          console.error(`Error: ${(err as Error).message}`);
          process.exitCode = 1;
        }
      },
    );
}
