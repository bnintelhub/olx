import crypto from 'crypto';

export interface CreateOrderParams {
  amount: number; // in paise (e.g. 10000 = Rs. 100)
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export class PaymentGatewayService {
  static async createOrder(params: CreateOrderParams) {
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      id: orderId,
      amount: params.amount,
      currency: params.currency || 'INR',
      receipt: params.receipt,
      status: 'created',
    };
  }

  static verifySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
    const generated = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return generated === signature;
  }
}
