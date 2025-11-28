import { Request, Response } from 'express';
import { authService } from '../services/AuthService';

export class AuthController {
  async login(req: Request, res: Response) {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    try {
      const result = await authService.login(password);
      if (!result) return res.status(401).json({ error: 'Invalid password' });
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  async changePassword(req: Request, res: Response) {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: 'New password required' });

    try {
      await authService.changePassword(newPassword);
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
}
