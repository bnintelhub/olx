export class EmailService {
  static async sendMail(options: { to: string; subject: string; text?: string; html?: string }): Promise<boolean> {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n======================================================`);
      console.log(`📧 [MOCK EMAIL DISPATCH]`);
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Body: ${options.text || options.html}`);
      console.log(`======================================================\n`);
      return true;
    }
    // In production, integrate with SendGrid, AWS SES, or Nodemailer
    return true;
  }

  static async sendOtpEmail(to: string, otp: string, purpose: string): Promise<boolean> {
    const isReset = purpose === 'PASSWORD_RESET';
    const subject = isReset
      ? 'Password Reset Code - OLX Marketplace'
      : 'Verify Your Email - OLX Marketplace';

    const text = isReset
      ? `Your password reset code is: ${otp}. This code is valid for 5 minutes. If you did not request this, please ignore this email.`
      : `Your verification OTP is: ${otp}. This code is valid for 5 minutes. Welcome to OLX Marketplace!`;

    return this.sendMail({ to, subject, text });
  }
}
