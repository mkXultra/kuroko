import { execa } from 'execa';
import { Task, Run, ConfigModel } from './types.js';

export class Executor {
  static async execute(task: Task, prompt: string, modelConfig: ConfigModel): Promise<Omit<Run, 'id' | 'created_at'>> {
    // Basic substitution. In a real app, strict shell escaping is mandatory.
    // For now, we assume the user trusts their own config templates.
    const commandStr = modelConfig.template
      .replace(/{sessionId}/g, task.session_id)
      .replace(/{prompt}/g, prompt);

    let stdout = '';
    let stderr = '';
    let exitCode = 0;
    
    try {
      // Using shell: true to handle the command string parsing easily
      const result = await execa(commandStr, { 
        shell: true, 
        cwd: task.workdir,
        reject: false
      });
      stdout = result.stdout;
      stderr = result.stderr;
      exitCode = result.exitCode ?? 0;
    } catch (e: any) {
      stderr = e.message;
      exitCode = 1;
    }

    return {
      task_id: task.id,
      prompt,
      stdout,
      stderr,
      exit_code: exitCode,
      status: exitCode === 0 ? 'success' : 'failed' // Preliminary status
    };
  }
}
