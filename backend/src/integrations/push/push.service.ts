export class PushService {
  static async sendPushNotification(userId: string, title: string, body: string, data?: Record<string, any>): Promise<boolean> {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔔 [PUSH NOTIFICATION] User: ${userId} | ${title}: ${body}`);
      return true;
    }
    // FCM / WebPush dispatch
    return true;
  }
}
