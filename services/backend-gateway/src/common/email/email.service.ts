import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { LoggerService } from '../logger/logger.service';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private transporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;
  private defaultFrom: string;
  private isConfigured: boolean = false;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.defaultFrom =
      this.configService.get<string>('SMTP_FROM') || 'QuickChat <noreply@quickchat.com>';
  }

  async onModuleInit(): Promise<void> {
    await this.initializeTransporter();
  }

  private async initializeTransporter(): Promise<void> {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !port) {
      this.logger.warn('SMTP not configured. Email sending will be simulated.', 'EmailService');
      this.isConfigured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
        tls: {
          rejectUnauthorized: this.configService.get<string>('NODE_ENV') === 'production',
        },
      });

      // Verify connection
      await this.transporter.verify();
      this.isConfigured = true;
      this.logger.log('SMTP transporter initialized successfully', 'EmailService');
    } catch (error: any) {
      this.logger.error(
        `Failed to initialize SMTP transporter: ${error.message}`,
        error.stack,
        'EmailService',
      );
      this.isConfigured = false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const { to, subject, text, html, from, replyTo, cc, bcc, attachments } = options;

    if (!this.isConfigured || !this.transporter) {
      // Simulate email sending in development/when not configured
      this.logger.log(
        `[SIMULATED] Email to ${Array.isArray(to) ? to.join(', ') : to}: ${subject}`,
        'EmailService',
      );
      return {
        success: true,
        messageId: `simulated_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      };
    }

    try {
      const result = await this.transporter.sendMail({
        from: from || this.defaultFrom,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text,
        html,
        replyTo,
        cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
        attachments,
      });

      this.logger.log(`Email sent successfully to ${to}: ${result.messageId}`, 'EmailService');

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to send email to ${to}: ${error.message}`,
        error.stack,
        'EmailService',
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendVerificationEmail(to: string, code: string, userName?: string): Promise<EmailResult> {
    const template = this.getVerificationTemplate(code, userName);
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendPasswordResetEmail(
    to: string,
    resetLink: string,
    userName?: string,
  ): Promise<EmailResult> {
    const template = this.getPasswordResetTemplate(resetLink, userName);
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendWelcomeEmail(to: string, userName: string): Promise<EmailResult> {
    const template = this.getWelcomeTemplate(userName);
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendNotificationEmail(
    to: string,
    subject: string,
    message: string,
    actionUrl?: string,
  ): Promise<EmailResult> {
    const template = this.getNotificationTemplate(subject, message, actionUrl);
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  private getVerificationTemplate(code: string, userName?: string): EmailTemplate {
    const greeting = userName ? `Hi ${userName}` : 'Hi';

    return {
      subject: 'Verify Your QuickChat Account',
      text: `${greeting},\n\nYour verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nBest regards,\nThe QuickChat Team`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">QuickChat</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Verify Your Account</h2>
            <p>${greeting},</p>
            <p>Your verification code is:</p>
            <div style="background: #667eea; color: white; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 8px; letter-spacing: 8px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Best regards,<br>The QuickChat Team
            </p>
          </div>
        </body>
        </html>
      `,
    };
  }

  private getPasswordResetTemplate(resetLink: string, userName?: string): EmailTemplate {
    const greeting = userName ? `Hi ${userName}` : 'Hi';

    return {
      subject: 'Reset Your QuickChat Password',
      text: `${greeting},\n\nWe received a request to reset your password. Click the link below to reset it:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email. Your password will remain unchanged.\n\nBest regards,\nThe QuickChat Team`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">QuickChat</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Reset Your Password</h2>
            <p>${greeting},</p>
            <p>We received a request to reset your password. Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Best regards,<br>The QuickChat Team
            </p>
          </div>
        </body>
        </html>
      `,
    };
  }

  private getWelcomeTemplate(userName: string): EmailTemplate {
    return {
      subject: 'Welcome to QuickChat!',
      text: `Hi ${userName},\n\nWelcome to QuickChat! We're thrilled to have you on board.\n\nWith QuickChat, you can:\n- Send instant messages to friends and family\n- Make high-quality voice and video calls\n- Share photos, videos, and files\n- Create group conversations\n\nStart connecting with your friends today!\n\nBest regards,\nThe QuickChat Team`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to QuickChat!</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Hi ${userName}!</h2>
            <p>We're thrilled to have you on board. QuickChat makes it easy to stay connected with the people who matter most.</p>
            <h3 style="color: #667eea;">What you can do:</h3>
            <ul style="color: #555;">
              <li>Send instant messages to friends and family</li>
              <li>Make high-quality voice and video calls</li>
              <li>Share photos, videos, and files</li>
              <li>Create group conversations</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Start Chatting</a>
            </div>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Best regards,<br>The QuickChat Team
            </p>
          </div>
        </body>
        </html>
      `,
    };
  }

  private getNotificationTemplate(
    subject: string,
    message: string,
    actionUrl?: string,
  ): EmailTemplate {
    const actionButton = actionUrl
      ? `<div style="text-align: center; margin: 30px 0;">
           <a href="${actionUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View Details</a>
         </div>`
      : '';

    return {
      subject,
      text: `${message}${actionUrl ? `\n\nView more: ${actionUrl}` : ''}\n\nBest regards,\nThe QuickChat Team`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">QuickChat</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">${subject}</h2>
            <p>${message}</p>
            ${actionButton}
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Best regards,<br>The QuickChat Team
            </p>
          </div>
        </body>
        </html>
      `,
    };
  }

  isEmailConfigured(): boolean {
    return this.isConfigured;
  }
}
