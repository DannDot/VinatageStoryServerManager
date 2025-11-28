import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { dbService } from './DatabaseService';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'admin';

export class AuthService {
  async initialize() {
    const currentHash = await dbService.getSetting('admin_password');
    if (!currentHash) {
      console.log('No admin password found. Setting default.');
      const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      await dbService.setSetting('admin_password', hash);
      await dbService.setSetting('is_default_password', 'true');
    }
  }

  async login(password: string) {
    const hash = await dbService.getSetting('admin_password');
    if (!hash) {
        console.error('Login failed: Auth not initialized (no hash found)');
        throw new Error('Auth not initialized');
    }

    const isValid = await bcrypt.compare(password, hash);
    if (!isValid) {
        console.log('Login failed: Invalid password');
        return null;
    }

    const isDefault = await dbService.getSetting('is_default_password');
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });

    return {
      token,
      mustChangePassword: isDefault === 'true'
    };
  }

  async changePassword(newPassword: string) {
    const hash = await bcrypt.hash(newPassword, 10);
    await dbService.setSetting('admin_password', hash);
    await dbService.setSetting('is_default_password', 'false');
  }
}

export const authService = new AuthService();
