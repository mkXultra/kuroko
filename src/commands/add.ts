import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
import { Store } from '../core/store.js';
import { Scheduler } from '../core/scheduler.js';

export function registerAddCommand(program: Command) {
  program
    .command('add <title> <prompt>')
    .description('Add a new task')
    .option('-m, --model <name>', 'Model name')
    .option('-d, --dir <path>', 'Working directory', process.cwd())
    .option('--at <time>', 'One-shot schedule (ISO date or interval like "2h")')
    .option('--cron <expr>', 'Recurring schedule (CRON expression)')
    .action(async (title, prompt, options) => {
      const HOME_DIR = os.homedir();
      const KUROKO_DIR = path.join(HOME_DIR, '.kuroko');
      const store = new Store(KUROKO_DIR);

      try {
        // Load config to check model default
        const config = await store.loadConfig();
        const model = options.model || config.defaultModel;
        
        let scheduleType: 'one-shot' | 'recurring' = 'one-shot';
        let scheduleValue = new Date().toISOString(); // Default: NOW

        if (options.cron) {
          scheduleType = 'recurring';
          scheduleValue = options.cron;
        } else if (options.at) {
          scheduleType = 'one-shot';
          scheduleValue = options.at;
        }
        
        // Calculate next run to validate schedule
        const nextRun = Scheduler.calculateNextRun({ type: scheduleType, value: scheduleValue });

        const task = await store.addTask({
          title,
          model,
          workdir: path.resolve(options.dir),
          status: 'active',
          base_prompt: prompt,
          next_prompt: prompt, // First run uses the base prompt
          schedule: {
            type: scheduleType,
            value: scheduleValue,
            next_run_at: nextRun
          }
        });

        console.log(chalk.green(`Task added: #${task.id} "${task.title}"`));
        console.log(`Next run at: ${nextRun}`);

      } catch (e: any) {
        console.error(chalk.red('Failed to add task:'), e.message);
        process.exit(1);
      }
    });
}
