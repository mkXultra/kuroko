import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
import { Store } from '../core/store.js';

export function registerInitCommand(program: Command) {
  program
    .command('init')
    .description('Initialize Kuroko configuration')
    .action(async () => {
      const HOME_DIR = os.homedir();
      const KUROKO_DIR = path.join(HOME_DIR, '.kuroko');
      const store = new Store(KUROKO_DIR);
      
      try {
        await store.init();
        console.log(chalk.green(`Initialized Kuroko at ${KUROKO_DIR}`));
      } catch (e: any) {
        console.error(chalk.red('Initialization failed:'), e.message);
        process.exit(1);
      }
    });
}
