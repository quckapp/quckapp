/**
 * SMS Service using Twilio Verify
 * Handles sending and verifying OTP via Twilio Verify API
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Twilio types
interface TwilioClient {
  verify: {
    v2: {
      services: (serviceSid: string) => {
        verifications: {
          create: (params: { to: string; channel: string }) => Promise<{
            sid: string;
            status: string;
            to: string;
            channel: string;
          }>;
        };
        verificationChecks: {
          create: (params: { to: string; code: string }) => Promise<{
            sid: string;
            status: string;
            to: string;
            valid: boolean;
          }>;
        };
      };
    };
  };
  messages: {
    create: (params: {
      body: string;
      from: string;
      to: string;
    }) => Promise<{ sid: string; status: string }>;
  };
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: TwilioClient | null = null;
  private readonly verifyServiceSid: string;
  private readonly twilioPhoneNumber: string;
  private readonly isDevelopment: boolean;
  private readonly useVerifyApi: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isDevelopment = this.configService.get('NODE_ENV') !== 'production';

    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.verifyServiceSid = this.configService.get<string>('TWILIO_VERIFY_SERVICE_SID') || '';
    this.twilioPhoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';

    // Use Verify API if service SID is provided
    this.useVerifyApi = !!this.verifyServiceSid;

    if (accountSid && authToken) {
      try {
        // Dynamic import of Twilio
        const twilio = require('twilio');
        this.twilioClient = twilio(accountSid, authToken);

        if (this.useVerifyApi) {
          this.logger.log('Twilio Verify service initialized successfully');
          this.logger.log(`Verify Service SID: ${this.verifyServiceSid.substring(0, 10)}...`);
        } else {
          this.logger.log('Twilio SMS service initialized (basic mode)');
        }
      } catch (error) {
        this.logger.warn(
          'Twilio SDK not installed or configuration error. SMS will be logged instead.',
        );
        this.logger.debug(`Error: ${error.message}`);
      }
    } else {
      this.logger.warn('Twilio credentials not configured. SMS will be logged instead.');
      if (!accountSid) this.logger.debug('Missing: TWILIO_ACCOUNT_SID');
      if (!authToken) this.logger.debug('Missing: TWILIO_AUTH_TOKEN');
    }
  }

  /**
   * Send OTP via Twilio Verify API
   * This uses Twilio's managed OTP service which handles code generation
   */
  async sendVerification(
    phoneNumber: string,
    channel: 'sms' | 'whatsapp' = 'sms',
  ): Promise<{
    success: boolean;
    message: string;
    status?: string;
  }> {
    const formattedNumber = this.formatPhoneNumber(phoneNumber);

    // In development without Twilio, just log
    if (this.isDevelopment && !this.twilioClient) {
      this.logger.log(`[DEV] Verification would be sent to: ${formattedNumber} via ${channel}`);
      return {
        success: true,
        message: 'Verification logged (development mode)',
        status: 'pending',
      };
    }

    if (!this.twilioClient || !this.useVerifyApi) {
      this.logger.warn('Twilio Verify not configured');
      return {
        success: false,
        message: 'Verification service not configured',
      };
    }

    try {
      const verification = await this.twilioClient.verify.v2
        .services(this.verifyServiceSid)
        .verifications.create({
          to: formattedNumber,
          channel: channel,
        });

      this.logger.log(`Verification sent to ${formattedNumber}. Status: ${verification.status}`);

      return {
        success: true,
        message: 'Verification code sent successfully',
        status: verification.status,
      };
    } catch (error) {
      this.logger.error(`Failed to send verification to ${phoneNumber}:`, error.message);

      if (error.code) {
        this.logger.error(`Twilio Error Code: ${error.code}`);
      }

      return {
        success: false,
        message: error.message || 'Failed to send verification',
      };
    }
  }

  /**
   * Verify OTP code via Twilio Verify API
   */
  async checkVerification(
    phoneNumber: string,
    code: string,
  ): Promise<{
    success: boolean;
    valid: boolean;
    message: string;
  }> {
    const formattedNumber = this.formatPhoneNumber(phoneNumber);

    // In development without Twilio, accept any 6-digit code
    if (this.isDevelopment && !this.twilioClient) {
      const isValid = /^\d{6}$/.test(code);
      this.logger.log(
        `[DEV] Verification check for ${formattedNumber}: ${isValid ? 'valid' : 'invalid'}`,
      );
      return {
        success: true,
        valid: isValid,
        message: isValid ? 'Code verified (development mode)' : 'Invalid code format',
      };
    }

    if (!this.twilioClient || !this.useVerifyApi) {
      return {
        success: false,
        valid: false,
        message: 'Verification service not configured',
      };
    }

    try {
      const verificationCheck = await this.twilioClient.verify.v2
        .services(this.verifyServiceSid)
        .verificationChecks.create({
          to: formattedNumber,
          code: code,
        });

      this.logger.log(
        `Verification check for ${formattedNumber}. Status: ${verificationCheck.status}, Valid: ${verificationCheck.valid}`,
      );

      return {
        success: true,
        valid: verificationCheck.valid,
        message: verificationCheck.valid
          ? 'Code verified successfully'
          : 'Invalid verification code',
      };
    } catch (error) {
      this.logger.error(`Failed to verify code for ${phoneNumber}:`, error.message);

      return {
        success: false,
        valid: false,
        message: error.message || 'Verification check failed',
      };
    }
  }

  /**
   * Send OTP SMS (legacy method for custom OTP codes)
   */
  async sendOtp(phoneNumber: string, otp: string): Promise<{ success: boolean; message: string }> {
    // If Verify API is available, use it instead
    if (this.useVerifyApi && this.twilioClient) {
      this.logger.log('Using Twilio Verify API for OTP');
      const result = await this.sendVerification(phoneNumber, 'sms');
      return {
        success: result.success,
        message: result.message,
      };
    }

    // Fallback to basic SMS
    const messageBody = `Your QuickChat verification code is: ${otp}. This code expires in 5 minutes.`;
    return this.sendSms(phoneNumber, messageBody);
  }

  /**
   * Send generic SMS message
   */
  async sendSms(
    phoneNumber: string,
    message: string,
  ): Promise<{ success: boolean; message: string }> {
    // In development, just log the message
    if (this.isDevelopment && !this.twilioClient) {
      this.logger.log(`[DEV SMS] To: ${phoneNumber}`);
      this.logger.log(`[DEV SMS] Message: ${message}`);
      return {
        success: true,
        message: 'SMS logged (development mode)',
      };
    }

    if (!this.twilioClient) {
      this.logger.warn(
        `[SMS NOT SENT] Twilio not configured. Message for ${phoneNumber}: ${message}`,
      );
      return {
        success: false,
        message: 'SMS service not configured',
      };
    }

    if (!this.twilioPhoneNumber) {
      this.logger.warn('TWILIO_PHONE_NUMBER not configured for basic SMS');
      return {
        success: false,
        message: 'SMS sender number not configured',
      };
    }

    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);

      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: formattedNumber,
      });

      this.logger.log(`SMS sent successfully to ${formattedNumber}. SID: ${result.sid}`);

      return {
        success: true,
        message: 'SMS sent successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phoneNumber}:`, error.message);

      if (error.code) {
        this.logger.error(`Twilio Error Code: ${error.code}`);
      }

      return {
        success: false,
        message: error.message || 'Failed to send SMS',
      };
    }
  }

  /**
   * Format phone number for Twilio
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any spaces or special characters except +
    let formatted = phoneNumber.replace(/[^\d+]/g, '');

    // Ensure it starts with +
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }

    return formatted;
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phoneNumber: string): boolean {
    const digits = phoneNumber.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }

  /**
   * Check if SMS service is available
   */
  isAvailable(): boolean {
    return this.twilioClient !== null || this.isDevelopment;
  }

  /**
   * Check if Verify API is being used
   */
  isUsingVerifyApi(): boolean {
    return this.useVerifyApi;
  }
}
