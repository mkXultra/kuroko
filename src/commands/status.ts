import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
import { Store } from '../core/store.js';

export function registerStatusCommand(program: Command) {
  program
    .command('status')
    .description('Show current status of tasks and decisions')
    .action(async () => {
      const HOME_DIR = os.homedir();
      const KUROKO_DIR = path.join(HOME_DIR, '.kuroko');
      const store = new Store(KUROKO_DIR);
      
      try {
        const storeData = await store.loadStore();
        
        // 1. Pending Decisions
        const pendingDecisions = storeData.decisions.filter(d => d.status === 'open');
        console.log(chalk.bold.underline('\n🛑 Pending Decisions (Needs Attention)'));
        if (pendingDecisions.length === 0) {
          console.log(chalk.dim('No pending decisions.'));
        } else {
          for (const d of pendingDecisions) {
            const run = storeData.runs.find(r => r.id === d.run_id);
            const task = run ? storeData.tasks.find(t => t.id === run.task_id) : undefined;
            console.log(chalk.red(`[Decision #${d.id}] Task #${task?.id} "${task?.title}"`));
            console.log(`  Reason: ${d.reason}`);
            console.log(`  Message: ${d.ai_message.split('\n')[0]}...`); // Show first line
            console.log(`  Run ID: ${d.run_id}`);
          }
        }

        // 2. Active Schedule
        const activeTasks = storeData.tasks.filter(t => t.status === 'active');
        console.log(chalk.bold.underline('\n📅 Upcoming Schedule'));
        if (activeTasks.length === 0) {
          console.log(chalk.dim('No active tasks scheduled.'));
        } else {
          // Sort by next run
          activeTasks.sort((a, b) => new Date(a.schedule.next_run_at).getTime() - new Date(b.schedule.next_run_at).getTime());
          
          for (const t of activeTasks) {
            console.log(chalk.green(`[Task #${t.id}] "${t.title}"`));
            console.log(`  Next Run: ${t.schedule.next_run_at} (${t.schedule.type})`);
          }
        }

        // 3. Paused Tasks (without open decisions?)
        const pausedTasks = storeData.tasks.filter(t => t.status === 'paused');
        if (pausedTasks.length > 0) {
           console.log(chalk.bold.underline('\n⏸️  Paused Tasks'));
           for (const t of pausedTasks) {
             const hasDecision = pendingDecisions.some(d => {
                const run = storeData.runs.find(r => r.id === d.run_id);
                return run && run.task_id === t.id;
             });
             if (!hasDecision) {
                console.log(chalk.yellow(`[Task #${t.id}] "${t.title}" (Paused manually or resolved but not activated)`));
             }
           }
        }

      } catch (e: any) {
        console.error(chalk.red('Failed to load status:'), e.message);
      }
    });
}
