#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const store_js_1 = require("../src/core/store.js");
const scheduler_js_1 = require("../src/core/scheduler.js");
const chalk_1 = __importDefault(require("chalk"));
const program = new commander_1.Command();
const HOME_DIR = os_1.default.homedir();
const KUROKO_DIR = path_1.default.join(HOME_DIR, '.kuroko');
const store = new store_js_1.Store(KUROKO_DIR);
program
    .name('kuroko')
    .description('AI Task Runner & Scheduler')
    .version('1.0.0');
program
    .command('init')
    .description('Initialize Kuroko configuration')
    .action(async () => {
    try {
        await store.init();
        console.log(chalk_1.default.green(`Initialized Kuroko at ${KUROKO_DIR}`));
    }
    catch (e) {
        console.error(chalk_1.default.red('Initialization failed:'), e.message);
        process.exit(1);
    }
});
program
    .command('add <title> <prompt>')
    .description('Add a new task')
    .option('-m, --model <name>', 'Model name')
    .option('-d, --dir <path>', 'Working directory', process.cwd())
    .option('--at <time>', 'One-shot schedule (ISO date or interval like "2h")')
    .option('--cron <expr>', 'Recurring schedule (CRON expression)')
    .option('--every <interval>', 'Alias for recurring interval (e.g. "2h" - NOT SUPPORTED YET in scheduler logic for recurring, use --at for one-shot interval)')
    .action(async (title, prompt, options) => {
    try {
        // Load config to check model default
        const config = await store.loadConfig();
        const model = options.model || config.defaultModel;
        let scheduleType = 'one-shot';
        let scheduleValue = new Date().toISOString(); // Default: NOW
        if (options.cron) {
            scheduleType = 'recurring';
            scheduleValue = options.cron;
        }
        else if (options.at) {
            scheduleType = 'one-shot';
            scheduleValue = options.at;
        }
        // Calculate next run to validate schedule
        const nextRun = scheduler_js_1.Scheduler.calculateNextRun({ type: scheduleType, value: scheduleValue });
        const task = await store.addTask({
            title,
            model,
            workdir: path_1.default.resolve(options.dir),
            status: 'active',
            schedule: {
                type: scheduleType,
                value: scheduleValue,
                next_run_at: nextRun
            }
        });
        console.log(chalk_1.default.green(`Task added: #${task.id} "${task.title}"`));
        console.log(`Next run at: ${nextRun}`);
    }
    catch (e) {
        console.error(chalk_1.default.red('Failed to add task:'), e.message);
        process.exit(1);
    }
});
program.parse();
