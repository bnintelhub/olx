import crypto from 'crypto';
import bcrypt from 'bcrypt';

export class HashUtil {
  static sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  static randomBytes(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  static async comparePassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
