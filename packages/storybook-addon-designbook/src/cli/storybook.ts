import type { Command } from 'commander';
import { loadConfig } from '../config.js';
import { findFreePort, StorybookDaemon } from '../storybook.js';

export function register(program: Command): void {
  const storybookCmd = program.command('storybook').description('Storybook process management');

  storybookCmd
    .command('start')
    .description('Start Storybook dev server and exit when ready (Storybook continues as daemon)')
    .option('--port <port>', 'Port to start Storybook on (auto-detected when omitted)')
    .option('--force', 'Stop any running Storybook before starting')
    .action(async (opts: { port?: string; force?: boolean }) => {
      const config = loadConfig(process.env['DESIGNBOOK_HOME']);
      const storybookCmdStr = config['designbook.cmd'] as string | undefined;
      if (!storybookCmdStr) {
        console.error('Error: designbook.cmd not configured in designbook.config.yml');
        process.exitCode = 1;
        return;
      }

      const sb = new StorybookDaemon(config.data);
      const port = opts.port ? parseInt(opts.port, 10) : opts.force ? undefined : await findFreePort();
      const result = await sb.start({
        cmd: storybookCmdStr,
        port,
        cwd: config['designbook.home'] as string | undefined,
        force: opts.force,
      });

      console.log(JSON.stringify(result));
      process.exit(result.ready ? 0 : 1);
    });

  storybookCmd
    .command('stop')
    .description('Stop a Storybook process started by storybook start')
    .action(async () => {
      const config = loadConfig(process.env['DESIGNBOOK_HOME']);
      const sb = new StorybookDaemon(config.data);
      await sb.stop();
      process.exit(0);
    });

  storybookCmd
    .command('status')
    .description('Check if a Storybook daemon is running')
    .action(() => {
      const config = loadConfig(process.env['DESIGNBOOK_HOME']);
      const sb = new StorybookDaemon(config.data);
      const st = sb.status();
      const url = st.running ? sb.url : undefined;
      console.log(JSON.stringify({ ...st, ...(url ? { url } : {}) }));
    });

  storybookCmd
    .command('logs')
    .description('Print Storybook daemon log output')
    .option('-f, --follow', 'Follow the log (tail with polling)')
    .action(async (opts: { follow?: boolean }) => {
      const config = loadConfig(process.env['DESIGNBOOK_HOME']);
      const sb = new StorybookDaemon(config.data);

      const content = sb.logs();
      if (content === undefined) {
        console.error('Error: no storybook.log found');
        process.exitCode = 1;
        return;
      }

      if (!opts.follow) {
        process.stdout.write(content);
        return;
      }

      // Follow mode via async generator
      for await (const chunk of sb.tailLogs()) {
        process.stdout.write(chunk);
      }
    });

  storybookCmd
    .command('restart')
    .description('Restart the Storybook daemon (stop + start)')
    .option('--port <port>', 'Port to start Storybook on (auto-detected when omitted)')
    .action(async (opts: { port?: string }) => {
      const config = loadConfig(process.env['DESIGNBOOK_HOME']);
      const storybookCmdStr = config['designbook.cmd'] as string | undefined;
      if (!storybookCmdStr) {
        console.error('Error: designbook.cmd not configured in designbook.config.yml');
        process.exitCode = 1;
        return;
      }

      const sb = new StorybookDaemon(config.data);
      const port = opts.port ? parseInt(opts.port, 10) : undefined;
      const result = await sb.restart({
        cmd: storybookCmdStr,
        port,
        cwd: config['designbook.home'] as string | undefined,
      });

      console.log(JSON.stringify(result));
      process.exit(result.ready ? 0 : 1);
    });
}
