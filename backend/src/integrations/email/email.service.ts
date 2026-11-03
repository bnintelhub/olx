export class EmailService {
  static async sendMail(options: { to: string; subject: string; text?: string; html?: string }): Promise<boolean> {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📧 [MOCK EMAIL] To: ${options.to} | Subject: ${options.subject}`);
      return true;
    }
    // SMTP / SendGrid dispatch logic
    return true;
  }
}
