#!/usr/bin/env node
import { Command } from 'commander';
import { registerInitCommand } from '../src/commands/init.js';
import { registerAddCommand } from '../src/commands/add.js';
import { registerRunCommand } from '../src/commands/run.js';
import { registerStatusCommand } from '../src/commands/status.js';
import { registerResolveCommand } from '../src/commands/resolve.js';

const program = new Command();

program
  .name('kuroko')
  .description('AI Task Runner & Scheduler')
  .version('1.0.0');

registerInitCommand(program);
registerAddCommand(program);
registerRunCommand(program);
registerStatusCommand(program);
registerResolveCommand(program);

program.parse();

