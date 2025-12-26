import { Cron } from 'croner';
import { add, parseISO, isValid } from 'date-fns';

export class Scheduler {
  static calculateNextRun(schedule: { type: 'one-shot' | 'recurring'; value: string }): string {
    if (schedule.type === 'recurring') {
      try {
        const next = new Cron(schedule.value).nextRun();
        if (!next) throw new Error('No next run found');
        return next.toISOString();
      } catch (e) {
        throw new Error(`Invalid cron expression: ${schedule.value}`);
      }
    } else {
      // one-shot
      // Check if it's an interval (e.g., "2h", "30m")
      const intervalMatch = schedule.value.match(/^(\d+)([hmsd])$/);
      if (intervalMatch) {
        const amount = parseInt(intervalMatch[1], 10);
        const unit = intervalMatch[2];
        const now = new Date();
        let nextDate: Date;

        switch (unit) {
          case 'h': nextDate = add(now, { hours: amount }); break;
          case 'm': nextDate = add(now, { minutes: amount }); break;
          case 's': nextDate = add(now, { seconds: amount }); break;
          case 'd': nextDate = add(now, { days: amount }); break;
          default: throw new Error('Invalid unit');
        }
        return nextDate.toISOString();
      }

      // Check if it's a valid ISO date
      const date = parseISO(schedule.value);
      if (isValid(date)) {
        return date.toISOString();
      }

      throw new Error(`Invalid date format: ${schedule.value}`);
    }
  }
}
