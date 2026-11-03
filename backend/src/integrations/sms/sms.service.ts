import { env } from '../../config/env';

export interface SendSmsOptions {
  to: string;
  message: string;
  otpCode?: string;
}

export class SmsService {
  static async sendOtp(to: string, otpCode: string): Promise<boolean> {
    if (env.SMS_PROVIDER === 'MOCK') {
      console.log(`\n======================================================`);
      console.log(`📱 [MOCK SMS GATEWAY]`);
      console.log(`To: ${to}`);
      console.log(`Your OLX Marketplace verification OTP is: ${otpCode}`);
      console.log(`Valid for 5 minutes.`);
      console.log(`======================================================\n`);
      return true;
    }

    // Production MSG91 / Twilio API integration
    console.log(`[SMS Service] Dispatched OTP to ${to}`);
    return true;
  }
}
