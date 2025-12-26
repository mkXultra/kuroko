import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
import { Store } from '../core/store.js';
import { Scheduler } from '../core/scheduler.js';
import { Executor } from '../core/executor.js';
import { Analyzer } from '../core/analyzer.js';

export function registerRunCommand(program: Command) {
  program
    .command('run')
    .description('Execute scheduled tasks')
    .action(async () => {
      const HOME_DIR = os.homedir();
      const KUROKO_DIR = path.join(HOME_DIR, '.kuroko');
      const store = new Store(KUROKO_DIR);
      
      try {
        const storeData = await store.loadStore();
        const config = await store.loadConfig();
        const now = new Date();

        const tasksToRun = storeData.tasks.filter(t => 
          t.status === 'active' && 
          new Date(t.schedule.next_run_at) <= now
        );

        if (tasksToRun.length === 0) {
          console.log('No tasks to run.');
          return;
        }

        console.log(`Found ${tasksToRun.length} tasks to run.`);

        for (const task of tasksToRun) {
          console.log(chalk.blue(`Running Task #${task.id}: ${task.title}`));
          
          const prompt = task.next_prompt || task.base_prompt;
          const modelConfig = config.models[task.model] || config.models[config.defaultModel];

          // Execute
          console.log(chalk.gray(`Executing prompt: ${prompt}`));
          const rawRun = await Executor.execute(task, prompt, modelConfig);
          
          // Analyze
          const analyzedRun = Analyzer.analyze(rawRun);
          
          // Save Run
          const savedRun = await store.addRun(analyzedRun);
          console.log(chalk.dim(`Run #${savedRun.id} completed with status: ${analyzedRun.status}`));

          // Handle Result
          if (analyzedRun.status !== 'success') {
            console.log(chalk.yellow(`Task #${task.id} paused due to: ${analyzedRun.status}`));
            
            task.status = 'paused';
            
            await store.addDecision({
              run_id: savedRun.id,
              reason: analyzedRun.status === 'failed' ? 'ERROR' : 'AI_CONFUSION',
              ai_message: analyzedRun.stderr || analyzedRun.stdout, // Use logs as message
              status: 'open'
            });

          } else {
            console.log(chalk.green(`Task #${task.id} succeeded.`));
             // Schedule next run
             if (task.schedule.type === 'one-shot') {
                task.status = 'completed';
             } else {
                try {
                  task.schedule.next_run_at = Scheduler.calculateNextRun(task.schedule);
                  console.log(chalk.dim(`Next run scheduled at: ${task.schedule.next_run_at}`));
                } catch (e) {
                  console.error(chalk.red(`Failed to calculate next run for recurring task #${task.id}, pausing.`), e);
                  task.status = 'paused';
                }
             }
          }
          
          // Clear next_prompt
          delete task.next_prompt;
          
          // Update Task in DB
          await store.updateTask(task);
        }
      } catch (e: any) {
        console.error(chalk.red('Run loop failed:'), e.message);
        process.exit(1);
      }
    });
}
