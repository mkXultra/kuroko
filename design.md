# Implementation Specification: Kuroko (AI Task Runner)

## 1. Project Overview

**Name**: Kuroko (`kuroko`)
**Concept**: An autonomous CLI tool that wraps existing AI CLIs (like Claude Code, Gemini CLI, etc.) to schedule, execute, and manage coding tasks passively. It acts as a "process manager" for AI agents.
**Goal**: Allow developers to register tasks ("Fix this bug", "Refactor this"), schedule them (One-shot or Recurring), and handle them asynchronously. Kuroko detects errors or file changes and pauses for user approval ("Decisions").

## 2. Technical Stack

* **Runtime**: Node.js (Latest LTS), ES Modules (`type: "module"`).
* **Language**: TypeScript.
* **CLI Framework**: `commander` (for command parsing).
* **Process Management**: `execa` (for running external AI tools).
* **Database**: `lowdb` (JSON file storage) or simple `fs` based JSON management.
* **Scheduling**: `node-cron` (for recurring tasks), `date-fns` (for time calculation).
* **File System**: `fs-extra` (for directory operations).

## 3. Directory Structure & File Paths

* **Global Config Directory**: `~/.kuroko/`
* `config.json`: User settings (model definitions).
* `store.json`: The main database (Tasks, Runs, Decisions, Artifacts).


* **Project Structure**:
```text
bin/
  kuroko.js      # Entry point
src/
  commands/      # CLI command handlers (add, run, status, etc.)
  core/
    store.ts     # JSON DB manager
    executor.ts  # Runs external CLI tools
    scheduler.ts # Handles next_run_at logic
    analyzer.ts  # Parses logs for errors/confusion
  utils/         # Git helpers, Time helpers

```



## 4. Data Models (JSON Schema)

### `~/.kuroko/config.json`

Defines how to call external AI tools.

```json
{
  "models": {
    "sonnet": {
      "template": "claude --session {sessionId} --prompt '{prompt}'"
    },
    "flash": {
      "template": "gemini chat --context {sessionId} --message '{prompt}'"
    }
  },
  "defaultModel": "sonnet"
}

```

### `~/.kuroko/store.json`

The central state.

```typescript
interface StoreSchema {
  tasks: Task[];
  runs: Run[];
  decisions: Decision[];
  artifacts: Artifact[];
}

interface Task {
  id: number;
  title: string;
  model: string;      // e.g., "sonnet"
  workdir: string;    // Absolute path
  session_id: string; // External session ID (e.g., UUID)
  status: 'active' | 'completed' | 'paused' | 'archived';
  schedule: {
    type: 'one-shot' | 'recurring';
    value: string;         // '2025-12-01T10:00' or '0 9 * * *' (cron)
    next_run_at: string;   // ISO String
  };
  created_at: string;
}

interface Run {
  id: number;
  task_id: number;
  prompt: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  status: 'success' | 'failed' | 'wandering' | 'changes_detected';
  created_at: string;
}

interface Decision {
  id: number;
  run_id: number;
  reason: 'ERROR' | 'AI_CONFUSION' | 'REVIEW_CHANGES';
  ai_message: string;
  status: 'open' | 'resolved';
}

interface Artifact {
  id: number;
  run_id: number;
  file_path: string;
  change_type: 'modified' | 'added' | 'deleted';
}

```

## 5. Core Logic Specifications

### A. Task Scheduling (`src/core/scheduler.ts`)

* **One-shot**: Parse user input (e.g., "tomorrow 10am") to ISO string.
* **Recurring**: Use CRON expression.
* **Execution Logic**:
* Find tasks where `status === 'active'` AND `schedule.next_run_at <= NOW`.
* After execution:
* If `recurring`: Calculate next run time using `node-cron` parser and update `next_run_at`.
* If `one-shot`: Update `status` to `completed`.





### B. Execution Engine (`src/core/executor.ts`)

1. **Prepare**: Resolve `workdir` and `model` template. Generate/Reuse `session_id`.
2. **Spawn**: Use `execa` to run the command in `workdir`.
3. **Analyze (`src/core/analyzer.ts`)**:
* Capture `stdout`/`stderr`.
* **Wandering Detection**: Check logs for keywords like "I need help", "Please select", "Multiple options". -> Flag as `wandering`.
* **Error Detection**: Check if `exit_code != 0`. -> Flag as `failed`.


4. **Artifact Check**:
* Run `git diff --name-only` and `git ls-files --others --exclude-standard` in `workdir`.
* If files changed -> Flag as `changes_detected` and **DO NOT COMMIT**.



### C. State Transitions

* If Run results in `failed`, `wandering`, or `changes_detected`:
* Create a **Decision** record.
* Set Task status to `paused` (stops future scheduled runs until resolved).



## 6. CLI Commands (UX)

### `kuroko init`

* Creates `~/.kuroko/` directory and default JSON files.

### `kuroko add <title> <prompt>`

* **Options**:
* `--model <name>`: Default to config default.
* `--dir <path>`: Execution directory (resolve to absolute path). Default: `cwd`.
* `--at <time>`: One-shot schedule (e.g., "2025-01-01 10:00").
* `--cron <expr>`: Recurring schedule (e.g., "0 9 * * *").
* `--every <interval>`: Interval alias (e.g., "2h" -> converts to internal logic).


* **Behavior**: Creates a Task. If no schedule options provided, set `next_run_at = NOW`.

### `kuroko run` (The Worker)

* **Usage**: Intended to be run via OS cron or manually.
* **Behavior**:
1. Load store.
2. Filter tasks ready to run (`active` & time passed).
3. Execute them sequentially.
4. Update Store (Runs, Decisions, Artifacts).



### `kuroko status`

* Displays:
* **Pending Decisions**: (ID, Task Title, Reason, Changed Files).
* **Upcoming Tasks**: Next run time.



### `kuroko resolve <decisionId> <instruction>`

* **Behavior**:
1. Mark Decision as `resolved`.
2. Set Task status back to `active`.
3. Trigger an immediate execution for the Task using `<instruction>` as the new prompt (continuing the session).



### `kuroko continue <taskId> <instruction>`

* **Behavior**: Manually trigger a new run for an existing task with additional instructions.

## 7. Development Phases (MVP)

1. **Phase 1**: Project setup, JSON Store logic, and `kuroko init`.
2. **Phase 2**: `kuroko add` and Scheduling logic (calculating `next_run_at`).
3. **Phase 3**: `kuroko run` (Executor & Analyzer implementation) with simple `subprocess`.
4. **Phase 4**: `kuroko status` and `resolve` (The loop closer).

## 8. Implementation Instructions for AI

* Start by setting up the TypeScript project structure.
* Implement the `Store` class first, as it underpins everything.
* Use `execa` for robust process handling.
* Ensure all file paths stored in JSON are **absolute**.
* Generate the code for `bin/kuroko.js` and `src/` modules.