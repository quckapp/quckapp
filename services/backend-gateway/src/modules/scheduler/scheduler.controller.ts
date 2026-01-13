import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface CronJobInfo {
  name: string;
  nextDate: string | null;
}

interface AddCronJobDto {
  name: string;
  cronTime: string;
}

interface AddIntervalDto {
  name: string;
  milliseconds: number;
}

@Controller('scheduler')
@UseGuards(JwtAuthGuard)
export class SchedulerController {
  constructor(private tasksService: TasksService) {}

  /**
   * Get all registered cron jobs
   */
  @Get('cron-jobs')
  getCronJobs(): CronJobInfo[] {
    const jobs = this.tasksService.getCronJobs();
    const result: CronJobInfo[] = [];

    jobs.forEach((job, name) => {
      const nextDate = job.nextDate();
      result.push({
        name,
        nextDate: nextDate ? nextDate.toString() : null,
      });
    });

    return result;
  }

  /**
   * Get all registered intervals
   */
  @Get('intervals')
  getIntervals(): string[] {
    return this.tasksService.getIntervals();
  }

  /**
   * Get all registered timeouts
   */
  @Get('timeouts')
  getTimeouts(): string[] {
    return this.tasksService.getTimeouts();
  }

  /**
   * Get scheduler status summary
   */
  @Get('status')
  getStatus() {
    const cronJobs = this.tasksService.getCronJobs();
    const intervals = this.tasksService.getIntervals();
    const timeouts = this.tasksService.getTimeouts();

    const upcomingJobs: Array<{ name: string; nextRun: string }> = [];
    cronJobs.forEach((job, name) => {
      const nextDate = job.nextDate();
      if (nextDate) {
        upcomingJobs.push({
          name,
          nextRun: nextDate.toString(),
        });
      }
    });

    // Sort by next run time
    upcomingJobs.sort((a, b) => new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime());

    return {
      summary: {
        cronJobs: cronJobs.size,
        intervals: intervals.length,
        timeouts: timeouts.length,
      },
      upcomingJobs: upcomingJobs.slice(0, 10), // Next 10 jobs
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Add a dynamic cron job (admin only)
   * Note: The callback is a placeholder - in real use, you'd have predefined task types
   */
  @Post('cron-jobs')
  addCronJob(@Body() dto: AddCronJobDto) {
    // For security, only allow predefined task names
    const allowedTasks: Record<string, () => void> = {
      'custom-cache-cleanup': () => {
        // Custom cache cleanup logic
      },
      'custom-health-check': () => {
        // Custom health check logic
      },
    };

    const callback = allowedTasks[dto.name];
    if (!callback) {
      return {
        success: false,
        message: `Task "${dto.name}" is not in the allowed list`,
        allowedTasks: Object.keys(allowedTasks),
      };
    }

    this.tasksService.addCronJob(dto.name, dto.cronTime, callback);

    return {
      success: true,
      message: `Cron job "${dto.name}" added with schedule: ${dto.cronTime}`,
    };
  }

  /**
   * Remove a dynamic cron job
   */
  @Delete('cron-jobs/:name')
  removeCronJob(@Param('name') name: string) {
    // Don't allow removing built-in jobs
    const builtInJobs = [
      'cache-cleanup',
      'session-cleanup',
      'otp-cleanup',
      'status-expiration',
      'disappearing-messages',
      'scheduled-messages',
      'analytics-aggregation',
      'daily-reports',
      'database-maintenance',
      'audit-log-cleanup',
      'notification-digest',
      'poll-expiration',
      'health-check',
    ];

    if (builtInJobs.includes(name)) {
      return {
        success: false,
        message: `Cannot remove built-in cron job "${name}"`,
      };
    }

    this.tasksService.removeCronJob(name);

    return {
      success: true,
      message: `Cron job "${name}" removed`,
    };
  }

  /**
   * Add a dynamic interval
   */
  @Post('intervals')
  addInterval(@Body() dto: AddIntervalDto) {
    // Limit interval frequency (minimum 10 seconds)
    if (dto.milliseconds < 10000) {
      return {
        success: false,
        message: 'Interval must be at least 10000ms (10 seconds)',
      };
    }

    this.tasksService.addInterval(dto.name, dto.milliseconds, () => {
      // Placeholder callback
    });

    return {
      success: true,
      message: `Interval "${dto.name}" added with period: ${dto.milliseconds}ms`,
    };
  }

  /**
   * Remove a dynamic interval
   */
  @Delete('intervals/:name')
  removeInterval(@Param('name') name: string) {
    this.tasksService.removeInterval(name);

    return {
      success: true,
      message: `Interval "${name}" removed`,
    };
  }
}
