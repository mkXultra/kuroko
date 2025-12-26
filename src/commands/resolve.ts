import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
import { Store } from '../core/store.js';

export function registerResolveCommand(program: Command) {
  program
    .command('resolve <decisionId> <instruction>')
    .description('Resolve a pending decision and resume the task with new instruction')
    .action(async (decisionIdStr, instruction) => {
      const decisionId = parseInt(decisionIdStr, 10);
      const HOME_DIR = os.homedir();
      const KUROKO_DIR = path.join(HOME_DIR, '.kuroko');
      const store = new Store(KUROKO_DIR);
      
      try {
        const storeData = await store.loadStore();
        
        // Find Decision
        const decision = storeData.decisions.find(d => d.id === decisionId);
        if (!decision) {
          console.error(chalk.red(`Decision #${decisionId} not found.`));
          process.exit(1);
        }

        if (decision.status === 'resolved') {
           console.log(chalk.yellow(`Decision #${decisionId} is already resolved.`));
           return;
        }

        // Find Run & Task
        const run = storeData.runs.find(r => r.id === decision.run_id);
        if (!run) throw new Error("Corrupted data: Run not found for decision");
        
        const task = storeData.tasks.find(t => t.id === run.task_id);
        if (!task) throw new Error("Corrupted data: Task not found for run");

        // Update Logic
        decision.status = 'resolved';
        task.status = 'active';
        task.next_prompt = instruction;
        task.schedule.next_run_at = new Date().toISOString(); // Run immediately

        await store.updateDecision(decision);
        await store.updateTask(task);
        
        console.log(chalk.green(`Decision #${decisionId} resolved.`));
        console.log(chalk.blue(`Task #${task.id} resumed. Next run: NOW`));
        
      } catch (e: any) {
        console.error(chalk.red('Failed to resolve:'), e.message);
        process.exit(1);
      }
    });
}
