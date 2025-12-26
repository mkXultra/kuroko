import { Run } from './types.js';

export class Analyzer {
  static analyze(run: Omit<Run, 'id' | 'created_at'>): Omit<Run, 'id' | 'created_at'> {
    let status = run.status;
    
    // 1. Check Exit Code
    if (run.exit_code !== 0) {
      status = 'failed';
    }

    // 2. Check for Wandering / Confusion
    const combinedLog = (run.stdout + run.stderr).toLowerCase();
    const confusionKeywords = [
      "i need help",
      "please select",
      "multiple options",
      "i am unsure",
      "clarification needed",
      "choice:" // CLI menus
    ];

    if (confusionKeywords.some(keyword => combinedLog.includes(keyword))) {
      status = 'wandering';
    }

    return {
      ...run,
      status
    };
  }
}
