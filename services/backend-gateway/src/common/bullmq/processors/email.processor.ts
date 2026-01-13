import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { LoggerService } from '../../logger/logger.service';
import { EmailService } from '../../email/email.service';
import { QUEUE_NAMES } from '../bullmq.module';
import { EmailJobData } from '../services/queue.service';

/**
 * EmailProcessor - BullMQ worker for processing email jobs
 * Design Pattern: Worker Pattern
 * Handles email delivery for various notification types using nodemailer
 */
@Processor(QUEUE_NAMES.EMAIL, {
  concurrency: 5,
  limiter: {
    max: 50,
    duration: 1000, // Max 50 emails per second (rate limiting for email providers)
  },
})
@Injectable()
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly logger: LoggerService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  /**
   * Process email job
   */
  async process(job: Job<EmailJobData>): Promise<any> {
    this.logger.log(`Processing email job ${job.id} (type: ${job.data.type})`, 'EmailProcessor');

    const { type, to, subject, template, context } = job.data;

    try {
      await job.updateProgress(10);

      switch (type) {
        case 'verification':
          return await this.processVerificationEmail(job);
        case 'password_reset':
          return await this.processPasswordResetEmail(job);
        case 'notification':
          return await this.processNotificationEmail(job);
        case 'welcome':
          return await this.processWelcomeEmail(job);
        default:
          return await this.processGenericEmail(job);
      }
    } catch (error: any) {
      this.logger.error(`Failed to process email job ${job.id}`, error.message, 'EmailProcessor');
      throw error;
    }
  }

  /**
   * Process email verification
   */
  private async processVerificationEmail(job: Job<EmailJobData>): Promise<any> {
    await job.updateProgress(30);

    const { to, context } = job.data;

    this.logger.log(`Sending verification email to ${to}`, 'EmailProcessor');

    await job.updateProgress(50);

    const result = await this.emailService.sendVerificationEmail(
      to,
      context?.code || context?.verificationCode || '',
      context?.userName,
    );

    await job.updateProgress(100);
    return {
      success: result.success,
      type: 'verification',
      recipient: to,
      messageId: result.messageId,
      sentAt: new Date().toISOString(),
      error: result.error,
    };
  }

  /**
   * Process password reset email
   */
  private async processPasswordResetEmail(job: Job<EmailJobData>): Promise<any> {
    await job.updateProgress(30);

    const { to, context } = job.data;

    this.logger.log(`Sending password reset email to ${to}`, 'EmailProcessor');

    await job.updateProgress(50);

    const result = await this.emailService.sendPasswordResetEmail(
      to,
      context?.resetLink || context?.resetUrl || '',
      context?.userName,
    );

    await job.updateProgress(100);
    return {
      success: result.success,
      type: 'password_reset',
      recipient: to,
      messageId: result.messageId,
      sentAt: new Date().toISOString(),
      error: result.error,
    };
  }

  /**
   * Process notification email (digest, alerts)
   */
  private async processNotificationEmail(job: Job<EmailJobData>): Promise<any> {
    await job.updateProgress(30);

    const { to, subject, context } = job.data;

    this.logger.log(`Sending notification email to ${to}: ${subject}`, 'EmailProcessor');

    await job.updateProgress(50);

    const result = await this.emailService.sendNotificationEmail(
      to,
      subject,
      context?.message || context?.body || '',
      context?.actionUrl,
    );

    await job.updateProgress(100);
    return {
      success: result.success,
      type: 'notification',
      recipient: to,
      subject,
      messageId: result.messageId,
      sentAt: new Date().toISOString(),
      error: result.error,
    };
  }

  /**
   * Process welcome email for new users
   */
  private async processWelcomeEmail(job: Job<EmailJobData>): Promise<any> {
    await job.updateProgress(30);

    const { to, context } = job.data;

    this.logger.log(`Sending welcome email to ${to}`, 'EmailProcessor');

    await job.updateProgress(50);

    const result = await this.emailService.sendWelcomeEmail(
      to,
      context?.userName || context?.name || 'User',
    );

    await job.updateProgress(100);
    return {
      success: result.success,
      type: 'welcome',
      recipient: to,
      messageId: result.messageId,
      sentAt: new Date().toISOString(),
      error: result.error,
    };
  }

  /**
   * Process generic email
   */
  private async processGenericEmail(job: Job<EmailJobData>): Promise<any> {
    await job.updateProgress(30);

    const { to, subject, template, context } = job.data;

    this.logger.log(`Sending email to ${to}: ${subject}`, 'EmailProcessor');

    await job.updateProgress(50);

    const result = await this.emailService.sendEmail({
      to,
      subject,
      text: context?.text || template || '',
      html: context?.html,
    });

    await job.updateProgress(100);
    return {
      success: result.success,
      type: 'generic',
      recipient: to,
      messageId: result.messageId,
      sentAt: new Date().toISOString(),
      error: result.error,
    };
  }
}
