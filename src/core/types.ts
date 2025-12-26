export interface Task {
  id: number;
  title: string;
  model: string;
  workdir: string;
  session_id: string;
  base_prompt: string; // The persistent instruction
  next_prompt?: string; // One-time instruction for the next run
  status: 'active' | 'completed' | 'paused' | 'archived';
  schedule: {
    type: 'one-shot' | 'recurring';
    value: string;
    next_run_at: string;
  };
  created_at: string;
}

export interface Run {
  id: number;
  task_id: number;
  prompt: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  status: 'success' | 'failed' | 'wandering' | 'changes_detected';
  created_at: string;
}

export interface Decision {
  id: number;
  run_id: number;
  reason: 'ERROR' | 'AI_CONFUSION' | 'REVIEW_CHANGES';
  ai_message: string;
  status: 'open' | 'resolved';
}

export interface Artifact {
  id: number;
  run_id: number;
  file_path: string;
  change_type: 'modified' | 'added' | 'deleted';
}

export interface ConfigModel {
  template: string;
}

export interface Config {
  models: Record<string, ConfigModel>;
  defaultModel: string;
}

export interface StoreSchema {
  tasks: Task[];
  runs: Run[];
  decisions: Decision[];
  artifacts: Artifact[];
}
