import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StoreSchema, Config, Task, Run, Decision } from './types.js';

export class Store {
  private configPath: string;
  private storePath: string;
  
  // デフォルト値
  private defaultStore: StoreSchema = {
    tasks: [],
    runs: [],
    decisions: [],
    artifacts: []
  };

  private defaultConfig: Config = {
    models: {
      sonnet: { template: "claude --session {sessionId} --prompt '{prompt}'" },
      flash: { template: "gemini chat --context {sessionId} --message '{prompt}'" },
      mock: { template: "echo 'MOCK EXECUTION: {prompt}'" }
    },
    defaultModel: "sonnet"
  };

  constructor(baseDir: string) {
    this.configPath = path.join(baseDir, 'config.json');
    this.storePath = path.join(baseDir, 'store.json');
  }

  async init(): Promise<void> {
    const dir = path.dirname(this.configPath);
    await fs.ensureDir(dir);

    if (!(await fs.pathExists(this.configPath))) {
      await fs.writeJSON(this.configPath, this.defaultConfig, { spaces: 2 });
    }

    if (!(await fs.pathExists(this.storePath))) {
      await fs.writeJSON(this.storePath, this.defaultStore, { spaces: 2 });
    }
  }

  async loadConfig(): Promise<Config> {
    return fs.readJSON(this.configPath);
  }

  async loadStore(): Promise<StoreSchema> {
    return fs.readJSON(this.storePath);
  }

  private async saveStore(data: StoreSchema): Promise<void> {
    await fs.writeJSON(this.storePath, data, { spaces: 2 });
  }

  async addTask(taskInput: Omit<Task, 'id' | 'created_at' | 'session_id'>): Promise<Task> {
    const store = await this.loadStore();
    
    // Auto-increment ID
    const maxId = store.tasks.reduce((max, t) => Math.max(max, t.id), 0);
    const newTask: Task = {
      ...taskInput,
      id: maxId + 1,
      session_id: uuidv4(),
      created_at: new Date().toISOString()
    };

    store.tasks.push(newTask);
    await this.saveStore(store);
    return newTask;
  }
  
  async getTask(id: number): Promise<Task | undefined> {
    const store = await this.loadStore();
    return store.tasks.find(t => t.id === id);
  }

  async updateTask(task: Task): Promise<void> {
    const store = await this.loadStore();
    const index = store.tasks.findIndex(t => t.id === task.id);
    if (index !== -1) {
      store.tasks[index] = task;
      await this.saveStore(store);
    }
  }

  async updateDecision(decision: Decision): Promise<void> {
    const store = await this.loadStore();
    const index = store.decisions.findIndex(d => d.id === decision.id);
    if (index !== -1) {
      store.decisions[index] = decision;
      await this.saveStore(store);
    }
  }

  async addRun(runInput: Omit<Run, 'id' | 'created_at'>): Promise<Run> {
    const store = await this.loadStore();
    const maxId = store.runs.reduce((max, r) => Math.max(max, r.id), 0);
    const newRun: Run = {
      ...runInput,
      id: maxId + 1,
      created_at: new Date().toISOString()
    };
    store.runs.push(newRun);
    await this.saveStore(store);
    return newRun;
  }

  async addDecision(decisionInput: Omit<Decision, 'id'>): Promise<Decision> {
    const store = await this.loadStore();
    const maxId = store.decisions.reduce((max, d) => Math.max(max, d.id), 0);
    const newDecision: Decision = {
      ...decisionInput,
      id: maxId + 1
    };
    store.decisions.push(newDecision);
    await this.saveStore(store);
    return newDecision;
  }
}
