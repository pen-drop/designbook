import type { Command } from 'commander';
import { loadConfig } from '../config.js';
import { StoryMeta } from '../story-entity.js';
import { storyIdResolver } from '../resolvers/story-id.js';
import type { ResolverContext } from '../resolvers/types.js';

export function register(program: Command): void {
  async function resolveStoryArg(identifier: string, config: ReturnType<typeof loadConfig>): Promise<string | null> {
    const ctx: ResolverContext = { config, params: {} };
    const result = await storyIdResolver.resolve(identifier, {}, ctx);

    if (result.resolved) return result.value!;

    if (result.candidates && result.candidates.length > 0) {
      console.log(
        JSON.stringify(
          {
            resolved: false,
            input: identifier,
            candidates: result.candidates,
          },
          null,
          2,
        ),
      );
      return null;
    }

    console.error(`Error: no match for "${identifier}"`);
    process.exitCode = 1;
    return null;
  }

  program
    .command('story')
    .description('Load StoryMeta entity — returns complete story data as JSON')
    .argument('[subcommandOrId]', 'Subcommand (check, checks) or story identifier')
    .argument('[storyId]', 'Story identifier when first arg is a subcommand')
    .option('--scene <ref>', 'Scene reference (e.g. design-system:shell) [deprecated: use positional arg]')
    .option('--section <name>', 'Section name — returns array of stories')
    .option('--checks-open', 'Filter checks to only open (status != done)')
    .option('--create', 'Create story dir + meta.yml if missing (triggers ensureMeta)')
    .option('--json <data>', 'JSON data (context-dependent)')
    .action(
      async (
        subcommandOrId: string | undefined,
        storyIdArg: string | undefined,
        opts: {
          scene?: string;
          section?: string;
          checksOpen?: boolean;
          create?: boolean;
          json?: string;
        },
      ) => {
        const config = loadConfig();
        const isSubcommand = subcommandOrId === 'check' || subcommandOrId === 'checks';

        try {
          // ── subcommand: check (update a single check result) ───────────────
          if (subcommandOrId === 'check') {
            const identifier = storyIdArg ?? opts.scene;
            if (!identifier) {
              console.error('Error: story identifier or --scene is required for check');
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

            let story: StoryMeta | null = null;
            if (storyIdArg) {
              const resolved = await resolveStoryArg(storyIdArg, config);
              if (!resolved) return;
              story = StoryMeta.load(config, resolved);
            } else {
              story = StoryMeta.loadByScene(config, opts.scene!);
            }
            if (!story) {
              console.error(`Error: story not found for "${identifier}"`);
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
          if (subcommandOrId === 'checks') {
            const identifier = storyIdArg ?? opts.scene;
            if (!identifier) {
              console.error('Error: story identifier or --scene is required for checks');
              process.exitCode = 1;
              return;
            }
            // Create story if --create is set, otherwise load
            let story: StoryMeta | null = null;
            if (opts.create) {
              // --create requires scene ref for createByScene (no storyId-based create)
              if (!opts.scene) {
                console.error('Error: --create requires --scene');
                process.exitCode = 1;
                return;
              }
              const metaData = opts.json ? JSON.parse(opts.json) : undefined;
              story = StoryMeta.createByScene(config, opts.scene, metaData);
            } else if (storyIdArg) {
              const resolved = await resolveStoryArg(storyIdArg, config);
              if (!resolved) return;
              story = StoryMeta.load(config, resolved);
            } else {
              story = StoryMeta.loadByScene(config, opts.scene!);
            }
            if (!story) {
              console.error('Error: could not resolve story or create story');
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

          // ── default path (no subcommand) ──────────────────────────────────
          if (opts.section) {
            // Return array of StoryMeta objects for all stories in section
            const stories = StoryMeta.list(config, { section: opts.section });
            const json = stories.map((s) => s.toJSON({ checksOpen: opts.checksOpen }));
            console.log(JSON.stringify(json, null, 2));
            return;
          }

          // Positional arg is the identifier (not a subcommand), or fall back to --scene
          const identifier = isSubcommand ? undefined : (subcommandOrId ?? opts.scene);
          if (!identifier) {
            console.error('Error: story identifier, --scene, or --section is required');
            process.exitCode = 1;
            return;
          }

          // --create requires scene ref for createByScene
          if (opts.create) {
            if (!opts.scene) {
              console.error('Error: --create requires --scene');
              process.exitCode = 1;
              return;
            }
            const metaData = opts.json ? JSON.parse(opts.json) : undefined;
            const story = StoryMeta.createByScene(config, opts.scene, metaData);
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

          // Load story: positional arg goes through resolver, --scene uses loadByScene
          let story: StoryMeta | null = null;
          if (subcommandOrId && !isSubcommand) {
            const resolved = await resolveStoryArg(subcommandOrId, config);
            if (!resolved) return;
            story = StoryMeta.load(config, resolved);
          } else {
            story = StoryMeta.loadByScene(config, opts.scene!);
          }
          if (!story) {
            console.error(`Error: story not found for "${identifier}"`);
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
        } catch (err) {
          console.error(`Error: ${(err as Error).message}`);
          process.exitCode = 1;
        }
      },
    );
}
