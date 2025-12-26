import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { Store } from '../store.js';
import { StoreSchema } from '../types.js';

const TEST_DIR = path.join(process.cwd(), '.kuroko-test');

describe('Store', () => {
  let store: Store;

  beforeEach(async () => {
    await fs.ensureDir(TEST_DIR);
    store = new Store(TEST_DIR);
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  it('should initialize configuration and store files if they do not exist', async () => {
    await store.init();

    const configExists = await fs.pathExists(path.join(TEST_DIR, 'config.json'));
    const storeExists = await fs.pathExists(path.join(TEST_DIR, 'store.json'));

    expect(configExists).toBe(true);
    expect(storeExists).toBe(true);
  });

  it('should load default configuration', async () => {
    await store.init();
    const config = await store.loadConfig();
    expect(config.defaultModel).toBe('sonnet');
    expect(config.models.sonnet).toBeDefined();
  });

  it('should add a new task and retrieve it', async () => {
    await store.init();
    
    const newTask = {
      title: 'Fix bug',
      model: 'sonnet',
      workdir: '/tmp',
      status: 'active' as const,
      schedule: {
        type: 'one-shot' as const,
        value: '2025-01-01',
        next_run_at: '2025-01-01T00:00:00.000Z'
      }
    };

    const createdTask = await store.addTask(newTask);

    expect(createdTask.id).toBe(1);
    expect(createdTask.session_id).toBeDefined();
    expect(createdTask.created_at).toBeDefined();

    const loadedStore = await store.loadStore();
    expect(loadedStore.tasks).toHaveLength(1);
    expect(loadedStore.tasks[0].title).toBe('Fix bug');
  });
});
